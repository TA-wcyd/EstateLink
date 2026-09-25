/**
 * SellProperty Module - Property Submission Form, Previews, Dropzones & Upload Handlers
 */
import { state } from '../state';
import { showToast, escapeHtml } from '../utils';

export class SellPropertyManager {
  static handlePropertyTypeChange() {
    const type = document.getElementById('prop-type')?.value;
    const bedsRow = document.getElementById('row-beds-baths');
    if (bedsRow) {
      if (type === 'land' || type === 'commercial') {
        bedsRow.style.display = 'none';
      } else {
        bedsRow.style.display = 'grid';
      }
    }
  }

  static addSelectedImages(fileList) {
    const files = Array.from(fileList);
    if (!files.length) return;

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        showToast(`File "${file.name}" is not a recognized image.`, 'error');
        return false;
      }
      if (file.size > 20 * 1024 * 1024) {
        showToast(`Image "${file.name}" exceeds 20MB limit.`, 'error');
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      state.sellForm.selectedImages.push(...validFiles);
      SellPropertyManager.renderImagePreviews();
    }
  }

  static handleImageSelection(event) {
    if (event.target.files) {
      SellPropertyManager.addSelectedImages(event.target.files);
    }
    event.target.value = '';
  }

  static renderImagePreviews() {
    const container = document.getElementById('image-previews-container');
    if (!container) return;

    container.innerHTML = '';

    // Render existing images if editing
    state.sellForm.existingImages.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = 'preview-item';
      item.innerHTML = `
        <img src="${img.url}" class="preview-img">
        <button type="button" class="preview-remove-btn" onclick="removeExistingImage(${img.id})">&times;</button>
        ${img.is_primary ? '<span class="preview-primary-badge">PRIMARY COVER</span>' : ''}
      `;
      container.appendChild(item);
    });

    // Render newly selected images
    state.sellForm.selectedImages.forEach((file, idx) => {
      const item = document.createElement('div');
      item.className = 'preview-item';
      const objectUrl = URL.createObjectURL(file);

      const isPrimary = (state.sellForm.existingImages.length === 0 && idx === 0);

      item.innerHTML = `
        <img src="${objectUrl}" class="preview-img" alt="${escapeHtml(file.name)}">
        <button type="button" class="preview-remove-btn" onclick="removeSelectedImage(${idx})">&times;</button>
        ${isPrimary ? '<span class="preview-primary-badge">PRIMARY COVER</span>' : ''}
      `;
      container.appendChild(item);
    });
  }

  static removeSelectedImage(index) {
    state.sellForm.selectedImages.splice(index, 1);
    SellPropertyManager.renderImagePreviews();
  }

  static async removeExistingImage(imageId) {
    if (!state.sellForm.editId) return;
    try {
      const response = await fetch(`/api/my-properties/${state.sellForm.editId}/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        state.sellForm.existingImages = state.sellForm.existingImages.filter(img => img.id !== imageId);
        SellPropertyManager.renderImagePreviews();
        showToast('Image removed.');
      }
    } catch (error) {
      showToast('Failed to remove image', 'error');
    }
  }

  static handleDocFile(file, type) {
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast(`Document "${file.name}" exceeds 20MB limit.`, 'error');
      return;
    }

    if (type === 'nid') {
      state.sellForm.nidFile = file;
      const nameEl = document.getElementById('nid-file-name');
      const statusBox = document.getElementById('nid-file-status');
      if (nameEl) nameEl.textContent = `🪪 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      if (statusBox) statusBox.style.display = 'flex';
    } else {
      state.sellForm.propFile = file;
      const nameEl = document.getElementById('prop-file-name');
      const statusBox = document.getElementById('prop-file-status');
      if (nameEl) nameEl.textContent = `📑 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      if (statusBox) statusBox.style.display = 'flex';
    }
  }

  static handleDocSelection(event, type) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      SellPropertyManager.handleDocFile(file, type);
    }
  }

  static clearDocSelection(type) {
    if (type === 'nid') {
      state.sellForm.nidFile = null;
      document.getElementById('input-nid-doc').value = '';
      document.getElementById('nid-file-status').style.display = 'none';
    } else {
      state.sellForm.propFile = null;
      document.getElementById('input-prop-doc').value = '';
      document.getElementById('prop-file-status').style.display = 'none';
    }
  }

  static resetSellForm() {
    state.sellForm = {
      selectedImages: [],
      existingImages: [],
      nidFile: null,
      propFile: null,
      editId: null
    };
    document.getElementById('form-sell-property')?.reset();
    document.getElementById('edit-property-id').value = '';
    document.getElementById('sell-form-main-title').textContent = 'List Your Property on EstateLink';
    document.getElementById('submit-property-btn').textContent = '🚀 Submit Property for Verification';
    document.getElementById('nid-file-status').style.display = 'none';
    document.getElementById('prop-file-status').style.display = 'none';

    // Auto-fill phone with user's registered phone
    const phoneInput = document.getElementById('prop-phone');
    if (phoneInput && state.user?.phone) {
      phoneInput.value = state.user.phone;
    }

    SellPropertyManager.renderImagePreviews();
  }

  static setupDropzones() {
    // Photos dropzone
    const imgZone = document.getElementById('images-dropzone');
    if (imgZone) {
      ['dragenter', 'dragover'].forEach(name => {
        imgZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          imgZone.style.borderColor = 'var(--color-brand)';
          imgZone.style.backgroundColor = 'rgba(99, 102, 241, 0.08)';
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        imgZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          imgZone.style.borderColor = '';
          imgZone.style.backgroundColor = '';
        });
      });

      imgZone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files) {
          SellPropertyManager.addSelectedImages(e.dataTransfer.files);
        }
      });
    }

    // NID document dropzone
    const nidZone = document.getElementById('nid-dropzone');
    if (nidZone) {
      ['dragenter', 'dragover'].forEach(name => {
        nidZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          nidZone.style.borderColor = 'var(--color-brand)';
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        nidZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          nidZone.style.borderColor = '';
        });
      });

      nidZone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          SellPropertyManager.handleDocFile(e.dataTransfer.files[0], 'nid');
        }
      });
    }

    // Ownership document dropzone
    const propZone = document.getElementById('prop-doc-dropzone');
    if (propZone) {
      ['dragenter', 'dragover'].forEach(name => {
        propZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          propZone.style.borderColor = 'var(--color-brand)';
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        propZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          propZone.style.borderColor = '';
        });
      });

      propZone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          SellPropertyManager.handleDocFile(e.dataTransfer.files[0], 'prop');
        }
      });
    }
  }

  static setupFormSubmission() {
    const sellForm = document.getElementById('form-sell-property');
    if (sellForm) {
      sellForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!state.token) {
          showToast('Please sign in before submitting.', 'error');
          if (window.openAuthModal) window.openAuthModal('login', 'user');
          return;
        }

        const editId = document.getElementById('edit-property-id').value;
        const title = document.getElementById('prop-title').value.trim();
        const property_type = document.getElementById('prop-type').value;
        const price = document.getElementById('prop-price').value;
        const size = document.getElementById('prop-size').value;
        const bedrooms = document.getElementById('prop-bedrooms').value;
        const bathrooms = document.getElementById('prop-bathrooms').value;
        const location = document.getElementById('prop-location').value.trim();
        const address = document.getElementById('prop-address').value.trim();
        const phone = document.getElementById('prop-phone').value.trim();
        const description = document.getElementById('prop-description').value.trim();
        const submitBtn = document.getElementById('submit-property-btn');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading details & documents...';

        const formData = new FormData();
        formData.append('title', title);
        formData.append('property_type', property_type);
        formData.append('price', price);
        formData.append('size', size);
        if (bedrooms) formData.append('bedrooms', bedrooms);
        if (bathrooms) formData.append('bathrooms', bathrooms);
        formData.append('location', location);
        formData.append('address', address);
        if (phone) formData.append('phone', phone);
        formData.append('description', description);

        // Append image files
        state.sellForm.selectedImages.forEach(file => {
          formData.append('images[]', file);
        });

        // Append documents
        if (state.sellForm.nidFile) {
          formData.append('nid_document', state.sellForm.nidFile);
        }
        if (state.sellForm.propFile) {
          formData.append('property_document', state.sellForm.propFile);
        }

        const url = editId ? `/api/my-properties/${editId}` : '/api/properties';

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${state.token}`,
              'Accept': 'application/json'
            },
            body: formData
          });

          if (response.status === 401) {
            if (window.logout) window.logout(false);
            if (window.openAuthModal) window.openAuthModal('login', 'user');
            showToast('Your session has expired. Please sign in again.', 'error');
            return;
          }

          const data = await response.json();

          if (response.ok) {
            showToast(data.message || 'Your property has been submitted and is waiting for Admin verification.', 'success');
            SellPropertyManager.resetSellForm();
            if (window.navigateTo) window.navigateTo('/my-properties');
          } else {
            const errorMessage = data.errors
              ? Object.values(data.errors).flat().join(', ')
              : (data.message || 'Submission failed. Please check form inputs.');
            showToast(errorMessage, 'error');
          }
        } catch (error) {
          console.error('Submission error:', error);
          showToast('Error during submission. Please try again.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = editId ? '💾 Update & Submit for Verification' : '🚀 Submit Property for Verification';
        }
      });
    }
  }
}
